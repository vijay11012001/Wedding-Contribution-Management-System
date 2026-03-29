package com.moi.service;

import com.moi.dto.MoiRequest;
import com.moi.dto.MoiResponse;
import com.moi.model.Contributor;
import com.moi.model.Event;
import com.moi.model.MoiTransaction;
import com.moi.repository.ContributorRepository;
import com.moi.repository.EventRepository;
import com.moi.repository.MoiTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MoiService {

    private final EventRepository eventRepository;
    private final ContributorRepository contributorRepository;
    private final MoiTransactionRepository moiTransactionRepository;

    public MoiService(EventRepository eventRepository, ContributorRepository contributorRepository, MoiTransactionRepository moiTransactionRepository) {
        this.eventRepository = eventRepository;
        this.contributorRepository = contributorRepository;
        this.moiTransactionRepository = moiTransactionRepository;
    }

    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    public Event createEvent(Event event) {
        return eventRepository.save(event);
    }

    @Transactional
    public MoiResponse recordMoi(MoiRequest request) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new RuntimeException("Event not found"));

        Contributor contributor = contributorRepository.findByNameAndVillage(request.getContributorName(), request.getVillage())
                .orElseGet(() -> {
                    Contributor newContributor = new Contributor();
                    newContributor.setName(request.getContributorName());
                    newContributor.setVillage(request.getVillage());
                    return contributorRepository.save(newContributor);
                });

        MoiTransaction transaction = new MoiTransaction();
        transaction.setAmount(request.getAmount());
        transaction.setTransactionDate(LocalDateTime.now());
        transaction.setEvent(event);
        transaction.setContributor(contributor);
        transaction.setNotes(request.getNotes());

        MoiTransaction savedTransaction = moiTransactionRepository.save(transaction);

        return MoiResponse.builder()
                .transactionId(savedTransaction.getId())
                .serialNumber(savedTransaction.getId())
                .contributorName(contributor.getName())
                .village(contributor.getVillage())
                .amount(savedTransaction.getAmount())
                .notes(savedTransaction.getNotes())
                .transactionDate(savedTransaction.getTransactionDate())
                .eventId(event.getId())
                .build();
    }

    @Transactional
    public MoiResponse updateMoi(Long transactionId, MoiRequest request) {
        MoiTransaction tx = moiTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("Transaction not found"));
                
        // Only update allowed fields (assume eventId is unchanged)
        tx.getContributor().setName(request.getContributorName());
        tx.getContributor().setVillage(request.getVillage());
        contributorRepository.save(tx.getContributor());
        
        tx.setAmount(request.getAmount());
        tx.setNotes(request.getNotes());
        moiTransactionRepository.save(tx);
        
        return MoiResponse.builder()
                .transactionId(tx.getId())
                .serialNumber(tx.getId())
                .contributorName(tx.getContributor().getName())
                .village(tx.getContributor().getVillage())
                .amount(tx.getAmount())
                .notes(tx.getNotes())
                .transactionDate(tx.getTransactionDate())
                .eventId(tx.getEvent().getId())
                .build();
    }
    
    @Transactional
    public void deleteMoi(Long transactionId) {
        moiTransactionRepository.deleteById(transactionId);
    }

    public List<MoiResponse> getTransactionsByEvent(Long eventId) {
        return moiTransactionRepository.findByEventId(eventId).stream()
                .map(tx -> MoiResponse.builder()
                        .transactionId(tx.getId())
                        .serialNumber(tx.getId())
                        .contributorName(tx.getContributor().getName())
                        .village(tx.getContributor().getVillage())
                        .amount(tx.getAmount())
                        .notes(tx.getNotes())
                        .transactionDate(tx.getTransactionDate())
                        .eventId(tx.getEvent().getId())
                        .build())
                .collect(Collectors.toList());
    }

    public List<MoiResponse> getAllTransactions() {
        return moiTransactionRepository.findAll().stream()
                .map(tx -> MoiResponse.builder()
                        .transactionId(tx.getId())
                        .serialNumber(tx.getId())
                        .contributorName(tx.getContributor().getName())
                        .village(tx.getContributor().getVillage())
                        .amount(tx.getAmount())
                        .notes(tx.getNotes())
                        .transactionDate(tx.getTransactionDate())
                        .eventId(tx.getEvent().getId())
                        .build())
                .collect(Collectors.toList());
    }

    public List<String> getAllVillages() {
        return contributorRepository.findDistinctVillages();
    }
}
